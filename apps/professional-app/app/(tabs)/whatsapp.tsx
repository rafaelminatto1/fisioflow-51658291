import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  KeyboardAvoidingView,
  Modal,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColorScheme";
import { useHaptics } from "@/hooks/useHaptics";
import { useRealtime } from "@/hooks/useRealtime";
import {
  useWhatsAppConversations,
  useWhatsAppOpenConversation,
  useWhatsAppResolveContact,
  useWhatsAppTags,
} from "@/hooks/useWhatsApp";
import { usePatients } from "@/hooks/usePatients";
import {
  ConversationsResponse,
  WaConversation,
  getContactName,
  getContactPhone,
  getMessageTextPreview,
} from "@/services/whatsapp-api";
import type { Patient } from "@/types";
import {
  avatarColorFor,
  fontFamily,
  radius,
  shadow,
  spacing,
  typography,
} from "@/constants/theme";

import { format, isToday, isYesterday, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

/** Verde do WhatsApp — semântica do canal, não cor de ação do produto. */
const WA_GREEN = "#25D366";

const STATUS_FILTERS = [
  { key: "all", label: "Todas" },
  { key: "open", label: "Abertas" },
  { key: "pending", label: "Pendentes" },
  { key: "mine", label: "Minhas" },
  { key: "unassigned", label: "Sem dono" },
  { key: "resolved", label: "Resolvidas" },
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number]["key"];

type ColorTokens = ReturnType<typeof useColors>;

/** Cor do ponto de cada filtro, espelhando os chips de etapa do mockup. */
function getFilterDotColor(key: StatusFilter, colors: ColorTokens): string | null {
  switch (key) {
    case "open":
      return colors.success;
    case "pending":
      return colors.warning;
    case "mine":
      return colors.primary;
    case "unassigned":
      return colors.textMuted;
    case "resolved":
      return colors.borderStrong;
    default:
      return null;
  }
}

/** Badge de etapa da conversa: rótulo curto em caixa alta + ponto da cor do status. */
function getStageBadge(
  status: string,
  colors: ColorTokens,
): { label: string; background: string; foreground: string; dot: string } {
  switch (status) {
    case "open":
      return {
        label: "Em andamento",
        background: colors.successSoft,
        foreground: colors.success,
        dot: colors.success,
      };
    case "pending":
      return {
        label: "Aguardando",
        background: colors.warningSoft,
        foreground: colors.warning,
        dot: colors.warning,
      };
    case "resolved":
    case "closed":
      return {
        label: "Resolvida",
        background: colors.surfaceHover,
        foreground: colors.textSecondary,
        dot: colors.textMuted,
      };
    default:
      return {
        label: status,
        background: colors.surfaceHover,
        foreground: colors.textSecondary,
        dot: colors.textMuted,
      };
  }
}
type WhatsAppRealtimeEvent = {
  type: string;
  conversationId?: string;
  message?: {
    content?: unknown;
    direction?: string;
    messageType?: string;
    createdAt?: string;
  };
  contact?: {
    name?: string;
    phone?: string;
  };
};

function sortConversationsByActivity(conversations: WaConversation[]): WaConversation[] {
  return [...conversations].sort((a, b) => {
    const aTime = Date.parse(a.lastMessageAt || a.updatedAt || a.createdAt || "");
    const bTime = Date.parse(b.lastMessageAt || b.updatedAt || b.createdAt || "");
    return bTime - aTime;
  });
}

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const date = parseISO(dateStr);
    if (Number.isNaN(date.getTime())) return "";

    if (isToday(date)) {
      return format(date, "HH:mm");
    }

    if (isYesterday(date)) {
      return "ontem";
    }

    if (differenceInDays(new Date(), date) < 7) {
      return format(date, "EEE", { locale: ptBR });
    }

    return format(date, "dd/MM");
  } catch {
    return "";
  }
}

function ConversationSkeleton({ colors }: { colors: ColorTokens }) {
  return (
    <View style={styles.convItem}>
      <View style={[styles.avatar, { backgroundColor: colors.border, opacity: 0.4 }]} />
      <View style={{ flex: 1, gap: spacing[2] }}>
        <View style={[styles.skeletonLine, { width: "55%", backgroundColor: colors.border }]} />
        <View
          style={[
            styles.skeletonLine,
            { width: "80%", backgroundColor: colors.border, opacity: 0.6 },
          ]}
        />
      </View>
    </View>
  );
}

function ConversationItem({
  item,
  colors,
  onPress,
}: {
  item: WaConversation;
  colors: ColorTokens;
  onPress: () => void;
}) {
  const name = getContactName(item);
  const phone = getContactPhone(item);
  const preview = getMessageTextPreview(item.lastMessage);
  const time = formatRelativeTime(item.lastMessageAt || item.updatedAt);
  const stage = getStageBadge(item.status, colors);
  const unread = item.unreadCount ?? 0;
  const isOutbound = item.lastMessage?.direction === "outbound";
  const isHighPriority = item.priority === "high" || item.priority === "urgent";
  const tags = item.tags ?? [];
  const showPhone = Boolean(phone) && phone !== name;

  return (
    <TouchableOpacity style={styles.convItem} onPress={onPress} activeOpacity={0.6}>
      <View style={[styles.avatar, { backgroundColor: avatarColorFor(name) }]}>
        <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
      </View>

      <View style={styles.convBody}>
        <View style={styles.convTopRow}>
          <View style={styles.convNameRow}>
            {isHighPriority && (
              <Ionicons
                name="alert-circle"
                size={13}
                color={colors.error}
                style={{ marginRight: 3 }}
              />
            )}
            <Text style={[styles.convName, { color: colors.text }]} numberOfLines={1}>
              {name}
            </Text>
          </View>
          <Text
            style={[
              styles.convTime,
              unread > 0
                ? { color: WA_GREEN, fontFamily: fontFamily.bold }
                : { color: colors.textMuted },
            ]}
          >
            {time}
          </Text>
        </View>

        <View style={styles.convPreviewRow}>
          {isOutbound && preview ? (
            <Ionicons name="checkmark-done" size={14} color={colors.info} />
          ) : null}
          <Text
            style={[
              styles.convPreview,
              unread > 0
                ? { color: colors.text, fontFamily: fontFamily.semibold }
                : { color: colors.textSecondary },
            ]}
            numberOfLines={1}
          >
            {preview || (showPhone ? phone : "Sem mensagens")}
          </Text>
        </View>

        <View style={styles.convMetaRow}>
          <View style={[styles.stagePill, { backgroundColor: stage.background }]}>
            <View style={[styles.stageDot, { backgroundColor: stage.dot }]} />
            <Text style={[styles.stageText, { color: stage.foreground }]} numberOfLines={1}>
              {stage.label}
            </Text>
          </View>
          {item.assignedToName ? (
            <View style={[styles.ownerPill, { backgroundColor: colors.surfaceHover }]}>
              <Ionicons name="person" size={10} color={colors.textSecondary} />
              <Text style={[styles.ownerText, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.assignedToName}
              </Text>
            </View>
          ) : null}
          {tags.slice(0, 2).map((tag) => (
            <View key={tag.id} style={[styles.tagPill, { borderColor: tag.color ?? colors.border }]}>
              <Text
                style={[styles.tagText, { color: tag.color ?? colors.textSecondary }]}
                numberOfLines={1}
              >
                {tag.name}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {unread > 0 && (
        <View style={[styles.unreadBadge, { backgroundColor: WA_GREEN }]}>
          <Text style={styles.unreadText}>{unread > 99 ? "99+" : unread}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function WhatsAppScreen() {
  const colors = useColors();
  const router = useRouter();
  const { light } = useHaptics();
  const queryClient = useQueryClient();
  const { subscribe } = useRealtime();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerMode, setComposerMode] = useState<"patient" | "manual">("patient");
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [manualPhone, setManualPhone] = useState("");
  const [manualName, setManualName] = useState("");

  const queryFilters = useMemo(() => {
    const filters: Record<string, string> = {};
    if (statusFilter !== "all") filters.status = statusFilter;
    if (selectedTagId) filters.tagId = selectedTagId;
    return filters;
  }, [selectedTagId, statusFilter]);

  const { data, isLoading, refetch } = useWhatsAppConversations(queryFilters);
  const { data: tags = [] } = useWhatsAppTags();
  const { data: patients, isLoading: isPatientsLoading } = usePatients({
    search: patientSearch.trim() || undefined,
    limit: 12,
  });
  const resolveContactMutation = useWhatsAppResolveContact();
  const openConversationMutation = useWhatsAppOpenConversation();

  const conversations = useMemo(() => {
    const list = data?.data ?? [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((c) => {
      const name = getContactName(c).toLowerCase();
      const phone = getContactPhone(c).toLowerCase();
      return name.includes(q) || phone.includes(q);
    });
  }, [data, search]);

  const totalUnread = useMemo(
    () => (data?.data ?? []).reduce((sum, c) => sum + (c.unreadCount ?? 0), 0),
    [data],
  );
  /**
   * Contagem por filtro derivada da lista já carregada — não há endpoint de
   * agregação. Quando um filtro de status está ativo a lista vem recortada pelo
   * servidor, então só o chip ativo tem número; é a mesma derivação que o painel
   * de resumo anterior fazia.
   */
  const filterCounts = useMemo(() => {
    const list = data?.data ?? [];
    const counts: Partial<Record<StatusFilter, number>> = { all: list.length };
    if (statusFilter === "all") {
      counts.open = list.filter((item) => item.status === "open").length;
      counts.pending = list.filter((item) => item.status === "pending").length;
      counts.resolved = list.filter(
        (item) => item.status === "resolved" || item.status === "closed",
      ).length;
      counts.unassigned = list.filter((item) => !item.assignedToName).length;
    } else {
      counts.all = undefined;
      counts[statusFilter] = list.length;
    }
    return counts;
  }, [data, statusFilter]);
  const isCreatingConversation =
    resolveContactMutation.isPending || openConversationMutation.isPending;
  const canSubmitManual = manualPhone.replace(/\D/g, "").length >= 10;

  useEffect(() => {
    return subscribe(
      ["whatsapp_new_message", "whatsapp_message", "whatsapp_message_failed"],
      (rawEvent) => {
        const event = rawEvent as WhatsAppRealtimeEvent;
        if (!event.conversationId) return;

        if (event.type === "whatsapp_new_message") {
          queryClient.setQueriesData<ConversationsResponse>(
            { queryKey: ["whatsapp-conversations"] },
            (current) => {
              if (!current) return current;

              let found = false;
              const occurredAt = event.message?.createdAt ?? new Date().toISOString();
              const updated = current.data.map((conversation) => {
                if (conversation.id !== event.conversationId) return conversation;
                found = true;
                return {
                  ...conversation,
                  contactName: event.contact?.name ?? conversation.contactName,
                  contactPhone: event.contact?.phone ?? conversation.contactPhone,
                  unreadCount: (conversation.unreadCount ?? 0) + 1,
                  lastMessage: {
                    content: event.message?.content ?? "",
                    messageType: event.message?.messageType ?? "text",
                    direction: event.message?.direction ?? "inbound",
                    createdAt: occurredAt,
                  },
                  lastMessageAt: occurredAt,
                  updatedAt: occurredAt,
                };
              });

              return found ? { ...current, data: sortConversationsByActivity(updated) } : current;
            },
          );
        }

        queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
      },
    );
  }, [queryClient, subscribe]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleOpenChat = (conv: WaConversation) => {
    light();
    router.push(`/whatsapp-chat/${conv.id}` as Href);
  };

  const resetComposer = () => {
    setComposerMode("patient");
    setPatientSearch("");
    setSelectedPatient(null);
    setManualPhone("");
    setManualName("");
  };

  const handleOpenComposer = () => {
    resetComposer();
    setIsComposerOpen(true);
  };

  const handleCloseComposer = () => {
    if (isCreatingConversation) return;
    setIsComposerOpen(false);
    resetComposer();
  };

  const handleCreateConversation = async () => {
    try {
      const input =
        composerMode === "patient"
          ? selectedPatient
            ? {
                patientId: selectedPatient.id,
                displayName: selectedPatient.name,
              }
            : null
          : {
              phone: manualPhone,
              displayName: manualName.trim() || undefined,
            };

      if (!input) {
        Alert.alert("Paciente obrigatório", "Selecione um paciente para iniciar a conversa.");
        return;
      }

      if (composerMode === "manual" && !canSubmitManual) {
        Alert.alert("Número inválido", "Digite um número com DDD para continuar.");
        return;
      }

      const contact = await resolveContactMutation.mutateAsync(input);
      const conversation = await openConversationMutation.mutateAsync(contact.id);
      handleCloseComposer();
      handleOpenChat(conversation);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Não foi possível iniciar a conversa.";
      Alert.alert("Erro ao criar conversa", message);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>CRM</Text>
          <View style={[styles.channelChip, { backgroundColor: WA_GREEN + "1F" }]}>
            <View style={[styles.channelDot, { backgroundColor: WA_GREEN }]} />
            <Text style={[styles.channelChipText, { color: WA_GREEN }]}>
              {totalUnread > 0
                ? `WhatsApp · ${totalUnread > 99 ? "99+" : totalUnread} não lidas`
                : "WhatsApp"}
            </Text>
          </View>
        </View>
      </View>

      {/* Status filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContent}
        style={styles.filtersScroll}
      >
        {STATUS_FILTERS.map((f) => {
          const active = statusFilter === f.key;
          const dot = getFilterDotColor(f.key, colors);
          const count = filterCounts[f.key];
          return (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterChip,
                {
                  backgroundColor: active ? colors.primary : colors.card,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setStatusFilter(f.key)}
              activeOpacity={0.7}
            >
              {dot && !active ? (
                <View style={[styles.filterDot, { backgroundColor: dot }]} />
              ) : null}
              <Text style={[styles.filterLabel, { color: active ? "#fff" : colors.textSecondary }]}>
                {f.label}
              </Text>
              {typeof count === "number" ? (
                <View
                  style={[
                    styles.filterCount,
                    { backgroundColor: active ? "#FFFFFF33" : colors.surfaceHover },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterCountText,
                      { color: active ? "#fff" : colors.textSecondary },
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: colors.surfaceHover }]}>
        <Ionicons name="search" size={17} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Buscar conversa ou paciente"
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearch("")}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={17} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {tags.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryFiltersContent}
          style={styles.categoryFiltersScroll}
        >
          <TouchableOpacity
            style={[
              styles.categoryChip,
              {
                backgroundColor: colors.card,
                borderColor: selectedTagId ? colors.border : colors.primary,
              },
            ]}
            onPress={() => setSelectedTagId(null)}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.categoryLabel,
                { color: selectedTagId ? colors.textSecondary : colors.primaryText },
              ]}
            >
              Todas categorias
            </Text>
          </TouchableOpacity>
          {tags.map((tag) => {
            const active = selectedTagId === tag.id;
            return (
              <TouchableOpacity
                key={tag.id}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: colors.card,
                    borderColor: active ? (tag.color ?? colors.primary) : colors.border,
                  },
                ]}
                onPress={() => setSelectedTagId(active ? null : tag.id)}
                activeOpacity={0.75}
              >
                <View
                  style={[styles.categoryDot, { backgroundColor: tag.color ?? colors.textMuted }]}
                />
                <Text
                  style={[
                    styles.categoryLabel,
                    { color: active ? (tag.color ?? colors.primaryText) : colors.textSecondary },
                  ]}
                >
                  {tag.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Conversation list */}
      {isLoading && !data ? (
        <>
          {[1, 2, 3, 4, 5].map((i) => (
            <ConversationSkeleton key={i} colors={colors} />
          ))}
        </>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ConversationItem item={item} colors={colors} onPress={() => handleOpenChat(item)} />
          )}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => (
            <View style={[styles.convSeparator, { backgroundColor: colors.borderSoft }]} />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={WA_GREEN}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={56} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Nenhuma conversa</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {search
                  ? "Nenhum resultado para sua busca"
                  : statusFilter === "mine"
                    ? "Nenhuma conversa atribuída a você"
                    : "Nenhuma conversa encontrada"}
              </Text>
              <TouchableOpacity
                style={[styles.emptyAction, { backgroundColor: WA_GREEN }]}
                onPress={handleOpenComposer}
                activeOpacity={0.85}
              >
                <Text style={styles.emptyActionText}>Iniciar nova conversa</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: WA_GREEN }]}
        onPress={handleOpenComposer}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Nova conversa"
      >
        <Ionicons name="create-outline" size={24} color="#fff" />
      </TouchableOpacity>

      <Modal
        visible={isComposerOpen}
        transparent
        animationType="fade"
        onRequestClose={handleCloseComposer}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalKeyboard}
          >
            <View
              style={[
                styles.modalCard,
                { backgroundColor: colors.background, borderColor: colors.border },
              ]}
            >
              <View style={styles.modalHeader}>
                <View>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Nova conversa</Text>
                  <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                    Escolha um paciente ou digite um número manualmente.
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleCloseComposer}
                  hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                >
                  <Ionicons name="close" size={22} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <View
                style={[
                  styles.modeSwitch,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                {[
                  { key: "patient", label: "Paciente" },
                  { key: "manual", label: "Número" },
                ].map((option) => {
                  const active = composerMode === option.key;
                  return (
                    <TouchableOpacity
                      key={option.key}
                      style={[styles.modeChip, active && { backgroundColor: WA_GREEN }]}
                      onPress={() => setComposerMode(option.key as "patient" | "manual")}
                      activeOpacity={0.85}
                    >
                      <Text
                        style={[
                          styles.modeChipText,
                          { color: active ? "#fff" : colors.textSecondary },
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {composerMode === "patient" ? (
                <View style={styles.modalSection}>
                  <View
                    style={[
                      styles.modalInputWrap,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                  >
                    <Ionicons name="search" size={16} color={colors.textMuted} />
                    <TextInput
                      style={[styles.modalInput, { color: colors.text }]}
                      placeholder="Buscar paciente por nome ou telefone"
                      placeholderTextColor={colors.textMuted}
                      value={patientSearch}
                      onChangeText={setPatientSearch}
                    />
                  </View>

                  <ScrollView
                    style={styles.patientResults}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                  >
                    {isPatientsLoading ? (
                      <View style={styles.loadingBlock}>
                        <ActivityIndicator color={WA_GREEN} />
                      </View>
                    ) : patients.length === 0 ? (
                      <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                        Nenhum paciente encontrado.
                      </Text>
                    ) : (
                      patients.map((patient) => {
                        const active = selectedPatient?.id === patient.id;
                        return (
                          <TouchableOpacity
                            key={patient.id}
                            style={[
                              styles.patientOption,
                              {
                                backgroundColor: active ? WA_GREEN + "14" : colors.surface,
                                borderColor: active ? WA_GREEN : colors.border,
                              },
                            ]}
                            onPress={() => setSelectedPatient(patient)}
                            activeOpacity={0.85}
                          >
                            <View style={{ flex: 1 }}>
                              <Text
                                style={[styles.patientName, { color: colors.text }]}
                                numberOfLines={1}
                              >
                                {patient.name}
                              </Text>
                              <Text
                                style={[styles.patientPhone, { color: colors.textSecondary }]}
                                numberOfLines={1}
                              >
                                {patient.phone || "Sem telefone cadastrado"}
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
              ) : (
                <View style={styles.modalSection}>
                  <View
                    style={[
                      styles.modalInputWrap,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                  >
                    <Ionicons name="person-outline" size={16} color={colors.textMuted} />
                    <TextInput
                      style={[styles.modalInput, { color: colors.text }]}
                      placeholder="Nome do contato opcional"
                      placeholderTextColor={colors.textMuted}
                      value={manualName}
                      onChangeText={setManualName}
                    />
                  </View>
                  <View
                    style={[
                      styles.modalInputWrap,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                  >
                    <Ionicons name="call-outline" size={16} color={colors.textMuted} />
                    <TextInput
                      style={[styles.modalInput, { color: colors.text }]}
                      placeholder="Número com DDD"
                      placeholderTextColor={colors.textMuted}
                      value={manualPhone}
                      onChangeText={setManualPhone}
                      keyboardType="phone-pad"
                    />
                  </View>
                  <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                    Use o formato que já costuma receber mensagens no WhatsApp.
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  {
                    backgroundColor:
                      composerMode === "patient"
                        ? selectedPatient
                          ? WA_GREEN
                          : colors.border
                        : canSubmitManual
                          ? WA_GREEN
                          : colors.border,
                  },
                ]}
                onPress={handleCreateConversation}
                disabled={
                  isCreatingConversation ||
                  (composerMode === "patient" ? !selectedPatient : !canSubmitManual)
                }
                activeOpacity={0.85}
              >
                {isCreatingConversation ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Abrir conversa</Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
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
    paddingHorizontal: spacing[5],
    paddingTop: spacing[1],
    paddingBottom: spacing[3],
  },
  headerLeft: {
    alignItems: "flex-start",
    gap: spacing[1],
    flex: 1,
  },
  headerTitle: {
    ...typography.h2,
    fontFamily: fontFamily.extrabold,
  },
  channelChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  channelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  channelChipText: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    letterSpacing: 0.2,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing[5],
    marginBottom: spacing[3],
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: radius.md,
    gap: 9,
  },
  searchInput: {
    flex: 1,
    fontFamily: fontFamily.medium,
    fontSize: 14,
    paddingVertical: 0,
  },
  filtersScroll: {
    flexGrow: 0,
    marginBottom: spacing[3],
  },
  filtersContent: {
    paddingHorizontal: spacing[5],
    gap: spacing[2],
    alignItems: "center",
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  filterDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  filterLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
  },
  filterCount: {
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  filterCountText: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
  },
  categoryFiltersScroll: {
    flexGrow: 0,
    marginBottom: spacing[3],
  },
  categoryFiltersContent: {
    paddingHorizontal: spacing[5],
    gap: spacing[2],
    alignItems: "center",
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  categoryDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  categoryLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 12,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 96,
  },
  convItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: spacing[5],
    gap: spacing[3],
  },
  convSeparator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 80,
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
    color: "#fff",
    fontFamily: fontFamily.extrabold,
    fontSize: 15,
  },
  convBody: {
    flex: 1,
    minWidth: 0,
  },
  convTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 3,
    gap: spacing[2],
  },
  convNameRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  convName: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    letterSpacing: -0.15,
    flexShrink: 1,
  },
  convTime: {
    fontFamily: fontFamily.semibold,
    fontSize: 11,
    flexShrink: 0,
  },
  convPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  convPreview: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  convMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    marginTop: 7,
  },
  stagePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  stageText: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  stageDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  ownerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    maxWidth: 150,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  ownerText: {
    fontFamily: fontFamily.semibold,
    fontSize: 10,
    flexShrink: 1,
  },
  tagPill: {
    maxWidth: 120,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  tagText: {
    fontFamily: fontFamily.semibold,
    fontSize: 10,
  },
  unreadBadge: {
    minWidth: 21,
    height: 21,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    flexShrink: 0,
  },
  unreadText: {
    color: "#fff",
    fontFamily: fontFamily.extrabold,
    fontSize: 11,
  },
  fab: {
    position: "absolute",
    right: spacing[5],
    bottom: spacing[6],
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.popover,
  },
  skeletonLine: {
    height: 14,
    borderRadius: 7,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 80,
    gap: spacing[2],
    paddingHorizontal: spacing[8],
  },
  emptyTitle: {
    ...typography.h3,
  },
  emptySubtitle: {
    ...typography.body,
    textAlign: "center",
  },
  emptyAction: {
    marginTop: spacing[2],
    borderRadius: radius.lg,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  emptyActionText: {
    color: "#fff",
    fontFamily: fontFamily.bold,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.38)",
    justifyContent: "flex-end",
  },
  modalKeyboard: {
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing[5],
    paddingTop: spacing[5],
    paddingBottom: spacing[6],
    borderWidth: StyleSheet.hairlineWidth,
    ...shadow.sheet,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  modalTitle: {
    ...typography.h2,
    fontFamily: fontFamily.extrabold,
  },
  modalSubtitle: {
    ...typography.small,
    marginTop: spacing[1],
  },
  modeSwitch: {
    flexDirection: "row",
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 4,
    marginBottom: spacing[4],
    gap: 6,
  },
  modeChip: {
    flex: 1,
    borderRadius: radius.sm,
    paddingVertical: 10,
    alignItems: "center",
  },
  modeChipText: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
  },
  modalSection: {
    gap: spacing[3],
  },
  modalInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing[3],
    gap: spacing[2],
  },
  modalInput: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 15,
    paddingVertical: 14,
  },
  patientResults: {
    maxHeight: 280,
  },
  patientOption: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  patientName: {
    fontFamily: fontFamily.semibold,
    fontSize: 15,
  },
  patientPhone: {
    ...typography.small,
    marginTop: 3,
  },
  helperText: {
    ...typography.small,
  },
  loadingBlock: {
    paddingVertical: spacing[6],
    alignItems: "center",
  },
  submitButton: {
    marginTop: 18,
    borderRadius: radius.lg,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonText: {
    color: "#fff",
    fontFamily: fontFamily.bold,
    fontSize: 15,
  },
});
