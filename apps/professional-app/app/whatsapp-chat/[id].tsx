import { useState, useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useColors } from "@/hooks/useColorScheme";
import { useHaptics } from "@/hooks/useHaptics";
import {
  useWhatsAppMessages,
  useWhatsAppSendMessage,
  useWhatsAppUpdateStatus,
  useWhatsAppAddNote,
  useWhatsAppQuickReplies,
  useWhatsAppAssignConversation,
  useWhatsAppTags,
  useWhatsAppTeamMembers,
  useWhatsAppAddTags,
  useWhatsAppRemoveTag,
} from "@/hooks/useWhatsApp";
import {
  WaMessage,
  getContactName,
  getContactPhone,
  getMessageText,
} from "@/services/whatsapp-api";

const WA_GREEN = "#25D366";

// ─── helpers ──────────────────────────────────────────────────────────────────

function getStatusLabel(status: string): string {
  switch (status) {
    case "open":
      return "Aberta";
    case "pending":
      return "Pendente";
    case "resolved":
      return "Resolvida";
    case "closed":
      return "Fechada";
    default:
      return status;
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case "open":
      return WA_GREEN;
    case "pending":
      return "#FF9500";
    default:
      return "#8E8E93";
  }
}

// iOS new Date() requires ISO 8601 with 'T', not space — Postgres returns space separator
function safeParseDate(raw?: string | null): Date {
  if (!raw) return new Date(NaN);
  // "2024-03-15 14:30:00.123+00" → "2024-03-15T14:30:00.123+00"
  const normalized = raw.replace(/^(\d{4}-\d{2}-\d{2}) /, "$1T");
  return new Date(normalized);
}

function getDateKey(dateStr?: string | null): string {
  const date = safeParseDate(dateStr);
  return Number.isNaN(date.getTime()) ? "unknown-date" : date.toLocaleDateString("pt-BR");
}

function formatTimeLabel(dateStr?: string | null): string {
  const date = safeParseDate(dateStr);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getDateLabel(dateStr: string): string {
  const date = safeParseDate(dateStr);
  if (Number.isNaN(date.getTime())) return "Sem data";
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (isSameDay(date, today)) return "Hoje";
  if (isSameDay(date, yesterday)) return "Ontem";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
}

// ─── list item types ──────────────────────────────────────────────────────────

type DateItem = { type: "date"; id: string; label: string };
type MsgItem = { type: "message"; id: string; data: WaMessage };
type ListItem = DateItem | MsgItem;

function buildListData(messages: WaMessage[]): ListItem[] {
  const items: ListItem[] = [];
  let lastDateKey = "";
  for (const msg of messages) {
    const dateKey = getDateKey(msg.createdAt);
    if (dateKey !== lastDateKey) {
      lastDateKey = dateKey;
      items.push({ type: "date", id: `date-${dateKey}`, label: getDateLabel(msg.createdAt) });
    }
    items.push({ type: "message", id: msg.id, data: msg });
  }
  return items;
}

// ─── sub-components ───────────────────────────────────────────────────────────

function MessageStatusIcon({ status }: { status: string }) {
  if (status === "pending") return <Ionicons name="time-outline" size={12} color="#8E8E93" />;
  if (status === "sent") return <Ionicons name="checkmark" size={12} color="#8E8E93" />;
  if (status === "delivered") return <Ionicons name="checkmark-done" size={12} color="#8E8E93" />;
  if (status === "read") return <Ionicons name="checkmark-done" size={12} color="#4FC3F7" />;
  if (status === "failed") return <Ionicons name="close-circle" size={12} color="#FF3B30" />;
  return null;
}

function DateSeparator({ label, colors }: { label: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.dateSeparator}>
      <View style={[styles.dateLine, { backgroundColor: colors.border }]} />
      <Text
        style={[styles.dateLabel, { color: colors.textMuted, backgroundColor: colors.background }]}
      >
        {label}
      </Text>
      <View style={[styles.dateLine, { backgroundColor: colors.border }]} />
    </View>
  );
}

function MessageBubble({
  item,
  colors,
}: {
  item: WaMessage;
  colors: ReturnType<typeof useColors>;
}) {
  const isOutbound = item.direction === "outbound";
  const isNote = item.isInternalNote || item.messageType === "note";
  const text = getMessageText(item);
  const time = formatTimeLabel(item.createdAt);

  if (isNote) {
    return (
      <View style={styles.noteWrapper}>
        <View style={styles.noteBubble}>
          <View style={styles.noteHeaderRow}>
            <Ionicons name="lock-closed" size={11} color="#856404" />
            <Text style={styles.noteHeaderLabel}>Nota interna</Text>
          </View>
          <Text style={styles.noteText}>{text}</Text>
          <Text style={styles.noteTime}>{time}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.bubbleRow, { justifyContent: isOutbound ? "flex-end" : "flex-start" }]}>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: isOutbound ? WA_GREEN + "28" : colors.surface,
            borderTopLeftRadius: isOutbound ? 16 : 4,
            borderTopRightRadius: isOutbound ? 4 : 16,
          },
        ]}
      >
        <Text style={[styles.bubbleText, { color: colors.text }]}>{text}</Text>
        <View style={styles.bubbleMeta}>
          <Text style={[styles.bubbleTime, { color: colors.textMuted }]}>{time}</Text>
          {isOutbound && <MessageStatusIcon status={item.status} />}
        </View>
      </View>
    </View>
  );
}

// ─── main screen ──────────────────────────────────────────────────────────────

export default function WhatsAppChatScreen() {
  const colors = useColors();
  const router = useRouter();
  const { light, medium } = useHaptics();
  const { id } = useLocalSearchParams<{ id: string }>();
  const safeId = id ?? "";

  const [inputText, setInputText] = useState("");
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [showAssignSheet, setShowAssignSheet] = useState(false);
  const [showTagSheet, setShowTagSheet] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  const { data, isLoading } = useWhatsAppMessages(safeId);
  const sendMutation = useWhatsAppSendMessage(safeId);
  const updateStatusMutation = useWhatsAppUpdateStatus();
  const addNoteMutation = useWhatsAppAddNote(safeId);
  const assignMutation = useWhatsAppAssignConversation();
  const addTagsMutation = useWhatsAppAddTags();
  const removeTagMutation = useWhatsAppRemoveTag();
  const { data: quickReplies } = useWhatsAppQuickReplies();
  const { data: teamMembers = [] } = useWhatsAppTeamMembers();
  const { data: allTags = [] } = useWhatsAppTags();

  const conversation = data?.conversation;
  const messages = data?.messages ?? [];
  const hasQuickReplies = (quickReplies?.length ?? 0) > 0;
  const conversationTags = conversation?.tags ?? [];
  const availableTags = useMemo(
    () => allTags.filter((tag) => !conversationTags.some((item) => item.id === tag.id)),
    [allTags, conversationTags],
  );

  const listData = useMemo(() => buildListData(messages), [messages]);

  // ── actions ──

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText("");
    light();
    try {
      await sendMutation.mutateAsync(text);
    } catch {
      Alert.alert("Erro", "Não foi possível enviar a mensagem.");
    }
  }, [inputText, sendMutation, light]);

  const handleResolve = useCallback(async () => {
    if (!conversation) return;
    medium();
    const newStatus = conversation.status === "resolved" ? "open" : "resolved";
    setShowActions(false);
    try {
      await updateStatusMutation.mutateAsync({ conversationId: safeId, status: newStatus });
    } catch {
      Alert.alert("Erro", "Não foi possível atualizar o status.");
    }
  }, [conversation, safeId, medium, updateStatusMutation]);

  const handleSetPending = useCallback(async () => {
    setShowActions(false);
    try {
      await updateStatusMutation.mutateAsync({ conversationId: safeId, status: "pending" });
    } catch {
      Alert.alert("Erro", "Não foi possível atualizar o status.");
    }
  }, [safeId, updateStatusMutation]);

  const handleAddNote = useCallback(async () => {
    const text = noteText.trim();
    if (!text) return;
    setNoteText("");
    setShowNoteInput(false);
    try {
      await addNoteMutation.mutateAsync(text);
    } catch {
      Alert.alert("Erro", "Não foi possível adicionar a nota.");
    }
  }, [noteText, addNoteMutation]);

  const handleAssignTo = useCallback(
    async (assignedTo: string) => {
      setShowAssignSheet(false);
      try {
        await assignMutation.mutateAsync({
          conversationId: safeId,
          assignedTo,
          reason: "Atribuição pelo app profissional",
        });
      } catch {
        Alert.alert("Erro", "Não foi possível atribuir a conversa.");
      }
    },
    [assignMutation, safeId],
  );

  const handleAddTag = useCallback(
    async (tagId: string) => {
      try {
        await addTagsMutation.mutateAsync({ conversationId: safeId, tagIds: [tagId] });
      } catch {
        Alert.alert("Erro", "Não foi possível categorizar a conversa.");
      }
    },
    [addTagsMutation, safeId],
  );

  const handleRemoveTag = useCallback(
    async (tagId: string) => {
      try {
        await removeTagMutation.mutateAsync({ conversationId: safeId, tagId });
      } catch {
        Alert.alert("Erro", "Não foi possível remover a categoria.");
      }
    },
    [removeTagMutation, safeId],
  );

  // ── derived values ──

  const contactName = conversation ? getContactName(conversation) : "";
  const contactPhone = conversation ? getContactPhone(conversation) : "";
  const status = conversation?.status ?? "";
  const statusColor = getStatusColor(status);
  const isResolved = status === "resolved" || status === "closed";
  const assignedLabel = conversation?.assignedToName || "Sem responsável";

  // ── render item ──

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if (item.type === "date") {
        return <DateSeparator label={item.label} colors={colors} />;
      }
      return <MessageBubble item={item.data} colors={colors} />;
    },
    [colors],
  );

  const keyExtractor = useCallback((item: ListItem) => item.id, []);

  // ── scroll to end when new content arrives ──

  const handleContentSizeChange = useCallback(() => {
    flatListRef.current?.scrollToEnd({ animated: false });
  }, []);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <View style={[styles.headerAvatar, { backgroundColor: WA_GREEN + "22" }]}>
            {isLoading && !conversation ? (
              <ActivityIndicator size="small" color={WA_GREEN} />
            ) : (
              <Text style={[styles.headerAvatarText, { color: WA_GREEN }]}>
                {contactName.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.headerName, { color: colors.text }]} numberOfLines={1}>
              {contactName || "Carregando..."}
            </Text>
            {contactPhone ? (
              <Text style={[styles.headerPhone, { color: colors.textMuted }]} numberOfLines={1}>
                {contactPhone}
              </Text>
            ) : null}
            {status ? (
              <View style={styles.headerMetaRow}>
                <Text style={[styles.headerStatus, { color: statusColor }]}>
                  {getStatusLabel(status)}
                </Text>
                <Text
                  style={[styles.headerMetaText, { color: colors.textMuted }]}
                  numberOfLines={1}
                >
                  {assignedLabel}
                </Text>
                {conversationTags[0] ? (
                  <Text
                    style={[
                      styles.headerMetaText,
                      { color: conversationTags[0].color ?? colors.textMuted },
                    ]}
                    numberOfLines={1}
                  >
                    {conversationTags[0].name}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={handleResolve}
            style={[
              styles.headerBtn,
              { backgroundColor: isResolved ? colors.surface : WA_GREEN + "22" },
            ]}
            disabled={updateStatusMutation.isPending}
          >
            {updateStatusMutation.isPending ? (
              <ActivityIndicator size="small" color={WA_GREEN} />
            ) : (
              <Ionicons
                name={isResolved ? "refresh" : "checkmark-done"}
                size={18}
                color={isResolved ? colors.textSecondary : WA_GREEN}
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowActions(true)}
            style={[styles.headerBtn, { backgroundColor: colors.surface }]}
          >
            <Ionicons name="ellipsis-vertical" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Resolved banner */}
      {isResolved && (
        <View
          style={[
            styles.resolvedBanner,
            { backgroundColor: "#F0FDF4", borderBottomColor: WA_GREEN + "40" },
          ]}
        >
          <Ionicons name="checkmark-circle" size={15} color={WA_GREEN} />
          <Text style={[styles.resolvedText, { color: WA_GREEN }]}>Conversa resolvida</Text>
          <TouchableOpacity onPress={handleResolve}>
            <Text style={[styles.resolvedReopen, { color: WA_GREEN }]}>Reabrir</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Messages */}
      {isLoading && listData.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={WA_GREEN} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={listData}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.messagesList}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={handleContentSizeChange}
          ListEmptyComponent={
            <View style={styles.emptyMessages}>
              <Ionicons name="chatbubble-ellipses-outline" size={52} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Nenhuma mensagem ainda
              </Text>
              <Text style={[styles.emptySubText, { color: colors.textMuted }]}>
                Envie uma mensagem para iniciar a conversa
              </Text>
            </View>
          }
        />
      )}

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* Note input panel */}
        {showNoteInput && (
          <View style={[styles.noteInputPanel, { borderTopColor: "#FFC107" }]}>
            <View style={styles.noteInputHeader}>
              <Ionicons name="lock-closed" size={13} color="#856404" />
              <Text style={styles.noteInputLabel}>Nota interna — visível apenas para a equipe</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowNoteInput(false);
                  setNoteText("");
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={16} color="#856404" />
              </TouchableOpacity>
            </View>
            <View style={styles.noteInputRow}>
              <TextInput
                style={styles.noteTextInput}
                placeholder="Escreva uma nota..."
                placeholderTextColor="#856404AA"
                value={noteText}
                onChangeText={setNoteText}
                multiline
                autoFocus
              />
              <TouchableOpacity
                onPress={handleAddNote}
                disabled={!noteText.trim() || addNoteMutation.isPending}
                style={[styles.noteSendBtn, { opacity: noteText.trim() ? 1 : 0.5 }]}
              >
                {addNoteMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="send" size={16} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Quick replies panel */}
        {showQuickReplies && hasQuickReplies && (
          <View
            style={[
              styles.quickRepliesPanel,
              { backgroundColor: colors.surface, borderTopColor: colors.border },
            ]}
          >
            <ScrollView style={{ maxHeight: 176 }} keyboardShouldPersistTaps="handled">
              {quickReplies!.map((qr) => (
                <TouchableOpacity
                  key={qr.id}
                  style={[styles.quickReplyItem, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    setInputText(qr.content);
                    setShowQuickReplies(false);
                    light();
                  }}
                >
                  <Text style={[styles.quickReplyTitle, { color: colors.text }]}>{qr.title}</Text>
                  <Text
                    style={[styles.quickReplyContent, { color: colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    {qr.content}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Input bar */}
        <View
          style={[
            styles.inputBar,
            { borderTopColor: colors.border, backgroundColor: colors.background },
          ]}
        >
          {hasQuickReplies && (
            <TouchableOpacity
              onPress={() => {
                setShowQuickReplies(!showQuickReplies);
                if (showNoteInput) setShowNoteInput(false);
              }}
              style={styles.inputAction}
            >
              <Ionicons
                name={showQuickReplies ? "chevron-down" : "flash-outline"}
                size={22}
                color={showQuickReplies ? WA_GREEN : colors.textSecondary}
              />
            </TouchableOpacity>
          )}

          <TextInput
            style={[
              styles.textInput,
              {
                color: colors.text,
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
            placeholder="Mensagem..."
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={4096}
            onFocus={() => setShowQuickReplies(false)}
          />

          <TouchableOpacity
            onPress={handleSend}
            disabled={sendMutation.isPending || !inputText.trim()}
            style={[
              styles.sendBtn,
              { backgroundColor: inputText.trim() ? WA_GREEN : colors.border },
            ]}
          >
            {sendMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Actions bottom sheet */}
      <Modal
        visible={showActions}
        transparent
        animationType="slide"
        onRequestClose={() => setShowActions(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowActions(false)}
        >
          {/* stopPropagation: prevents sheet taps from closing the modal */}
          <View
            style={[styles.actionsSheet, { backgroundColor: colors.surface }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

            <Text style={[styles.sheetTitle, { color: colors.text }]}>Ações da conversa</Text>

            <TouchableOpacity
              style={[styles.actionItem, { borderBottomColor: colors.border }]}
              onPress={handleResolve}
            >
              <Ionicons
                name={isResolved ? "refresh" : "checkmark-done"}
                size={20}
                color={isResolved ? colors.textSecondary : WA_GREEN}
              />
              <Text style={[styles.actionLabel, { color: colors.text }]}>
                {isResolved ? "Reabrir conversa" : "Marcar como resolvida"}
              </Text>
            </TouchableOpacity>

            {status !== "pending" && !isResolved && (
              <TouchableOpacity
                style={[styles.actionItem, { borderBottomColor: colors.border }]}
                onPress={handleSetPending}
              >
                <Ionicons name="time-outline" size={20} color="#FF9500" />
                <Text style={[styles.actionLabel, { color: colors.text }]}>
                  Marcar como pendente
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.actionItem, { borderBottomColor: colors.border }]}
              onPress={() => {
                setShowActions(false);
                setShowNoteInput(true);
                setShowQuickReplies(false);
              }}
            >
              <Ionicons name="lock-closed-outline" size={20} color="#856404" />
              <Text style={[styles.actionLabel, { color: colors.text }]}>
                Adicionar nota interna
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionItem, { borderBottomColor: colors.border }]}
              onPress={() => {
                setShowActions(false);
                setShowAssignSheet(true);
              }}
            >
              <Ionicons name="person-add-outline" size={20} color={WA_GREEN} />
              <Text style={[styles.actionLabel, { color: colors.text }]}>Atribuir responsável</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionItem, { borderBottomColor: colors.border }]}
              onPress={() => {
                setShowActions(false);
                setShowTagSheet(true);
              }}
            >
              <Ionicons name="pricetags-outline" size={20} color="#0A84FF" />
              <Text style={[styles.actionLabel, { color: colors.text }]}>Categorizar conversa</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionItem, { borderBottomColor: "transparent" }]}
              onPress={() => setShowActions(false)}
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
              <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showAssignSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAssignSheet(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAssignSheet(false)}
        >
          <View
            style={[styles.actionsSheet, { backgroundColor: colors.surface }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Atribuir conversa</Text>
            <ScrollView style={styles.sheetList} keyboardShouldPersistTaps="handled">
              {teamMembers.length === 0 ? (
                <Text style={[styles.sheetEmptyText, { color: colors.textMuted }]}>
                  Nenhum membro da equipe encontrado.
                </Text>
              ) : (
                teamMembers.map((member) => {
                  const active = conversation?.assignedTo === member.userId;
                  return (
                    <TouchableOpacity
                      key={member.userId}
                      style={[styles.sheetOption, { borderBottomColor: colors.border }]}
                      onPress={() => handleAssignTo(member.userId)}
                      disabled={assignMutation.isPending}
                    >
                      <View style={[styles.memberAvatar, { backgroundColor: WA_GREEN + "18" }]}>
                        <Text style={[styles.memberAvatarText, { color: WA_GREEN }]}>
                          {member.name.slice(0, 2).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          style={[styles.sheetOptionTitle, { color: colors.text }]}
                          numberOfLines={1}
                        >
                          {member.name}
                        </Text>
                        <Text
                          style={[styles.sheetOptionSubtitle, { color: colors.textMuted }]}
                          numberOfLines={1}
                        >
                          {member.email || member.role || "Equipe"}
                        </Text>
                      </View>
                      {active ? (
                        <Ionicons name="checkmark-circle" size={20} color={WA_GREEN} />
                      ) : null}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showTagSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTagSheet(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowTagSheet(false)}
        >
          <View
            style={[styles.actionsSheet, { backgroundColor: colors.surface }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Categorias da conversa</Text>
            <ScrollView style={styles.sheetList} keyboardShouldPersistTaps="handled">
              {conversationTags.length > 0 && (
                <View style={styles.currentTagsBlock}>
                  <Text style={[styles.sheetSectionLabel, { color: colors.textMuted }]}>
                    Aplicadas
                  </Text>
                  {conversationTags.map((tag) => (
                    <TouchableOpacity
                      key={tag.id}
                      style={[styles.sheetOption, { borderBottomColor: colors.border }]}
                      onPress={() => handleRemoveTag(tag.id)}
                      disabled={removeTagMutation.isPending}
                    >
                      <View
                        style={[styles.tagDotLarge, { backgroundColor: tag.color ?? WA_GREEN }]}
                      />
                      <Text style={[styles.sheetOptionTitle, { color: colors.text }]}>
                        {tag.name}
                      </Text>
                      <Ionicons name="close-circle-outline" size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <Text style={[styles.sheetSectionLabel, { color: colors.textMuted }]}>Adicionar</Text>
              {availableTags.length === 0 ? (
                <Text style={[styles.sheetEmptyText, { color: colors.textMuted }]}>
                  Todas as categorias disponíveis já estão aplicadas.
                </Text>
              ) : (
                availableTags.map((tag) => (
                  <TouchableOpacity
                    key={tag.id}
                    style={[styles.sheetOption, { borderBottomColor: colors.border }]}
                    onPress={() => handleAddTag(tag.id)}
                    disabled={addTagsMutation.isPending}
                  >
                    <View
                      style={[styles.tagDotLarge, { backgroundColor: tag.color ?? WA_GREEN }]}
                    />
                    <Text style={[styles.sheetOptionTitle, { color: colors.text }]}>
                      {tag.name}
                    </Text>
                    <Ionicons name="add-circle-outline" size={18} color={WA_GREEN} />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  // header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  backBtn: { padding: 4 },
  headerInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerAvatarText: { fontSize: 15, fontWeight: "700" },
  headerText: { flex: 1, minWidth: 0 },
  headerName: { fontSize: 16, fontWeight: "600" },
  headerPhone: { fontSize: 12, marginTop: 1 },
  headerStatus: { fontSize: 12, fontWeight: "500", marginTop: 1 },
  headerMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 1,
    minWidth: 0,
  },
  headerMetaText: {
    fontSize: 11,
    fontWeight: "500",
    flexShrink: 1,
    maxWidth: 120,
  },
  headerActions: { flexDirection: "row", gap: 6 },
  headerBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  // resolved banner
  resolvedBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resolvedText: { flex: 1, fontSize: 13, fontWeight: "500" },
  resolvedReopen: { fontSize: 13, fontWeight: "700", textDecorationLine: "underline" },

  // messages list
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  messagesList: { padding: 12, paddingBottom: 8, flexGrow: 1 },

  // date separator
  dateSeparator: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 12,
    gap: 8,
  },
  dateLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dateLabel: {
    fontSize: 12,
    fontWeight: "500",
    paddingHorizontal: 8,
  },

  // message bubbles
  bubbleRow: { flexDirection: "row", marginVertical: 2 },
  bubble: {
    maxWidth: "78%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  bubbleMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 4,
  },
  bubbleTime: { fontSize: 11 },

  // internal notes
  noteWrapper: { alignItems: "center", marginVertical: 6 },
  noteBubble: {
    maxWidth: "88%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#FFF3CD",
    borderWidth: 1,
    borderColor: "#FFC10740",
  },
  noteHeaderRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
  noteHeaderLabel: { fontSize: 11, fontWeight: "600", color: "#856404" },
  noteText: { fontSize: 14, color: "#856404" },
  noteTime: { fontSize: 11, color: "#856404AA", marginTop: 4, textAlign: "right" },

  // empty state
  emptyMessages: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 10,
  },
  emptyText: { fontSize: 16, fontWeight: "600" },
  emptySubText: { fontSize: 13 },

  // note input panel
  noteInputPanel: {
    backgroundColor: "#FFF3CD",
    borderTopWidth: 2,
    padding: 12,
  },
  noteInputHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  noteInputLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: "500",
    color: "#856404",
  },
  noteInputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  noteTextInput: {
    flex: 1,
    fontSize: 14,
    color: "#856404",
    maxHeight: 80,
  },
  noteSendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#856404",
    alignItems: "center",
    justifyContent: "center",
  },

  // quick replies
  quickRepliesPanel: { borderTopWidth: StyleSheet.hairlineWidth },
  quickReplyItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  quickReplyTitle: { fontSize: 14, fontWeight: "600" },
  quickReplyContent: { fontSize: 13, marginTop: 1 },

  // input bar
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: Platform.OS === "ios" ? 24 : 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  inputAction: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  textInput: {
    flex: 1,
    minHeight: 36,
    maxHeight: 100,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 15,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  // actions modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  actionsSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: { fontSize: 16, fontWeight: "700", marginBottom: 16 },
  sheetList: { maxHeight: 360 },
  sheetOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  sheetOptionTitle: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  sheetOptionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  sheetEmptyText: {
    fontSize: 13,
    lineHeight: 18,
    paddingVertical: 12,
  },
  sheetSectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0,
    marginTop: 4,
    marginBottom: 4,
  },
  currentTagsBlock: {
    marginBottom: 10,
  },
  memberAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  memberAvatarText: {
    fontSize: 12,
    fontWeight: "800",
  },
  tagDotLarge: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 14,
  },
  actionLabel: { fontSize: 16 },
});
