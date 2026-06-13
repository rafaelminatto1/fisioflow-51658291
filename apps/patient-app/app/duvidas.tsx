import { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColorScheme";
import { Spacing } from "@/constants/spacing";
import { patientApi } from "@/lib/api";

type ChatItem = {
  id: string;
  role: "user" | "assistant";
  text: string;
  sources?: Array<{ id: string; title: string }>;
};

const EXAMPLES = [
  "Posso fazer os exercícios sentindo dor?",
  "Como devo aplicar gelo em casa?",
  "Quantas vezes por dia faço os alongamentos?",
];

const FIXED_DISCLAIMER =
  "Este assistente dá orientações gerais e não substitui o seu fisioterapeuta. Em caso de dor intensa ou piora, fale com a clínica.";

export default function DuvidasScreen() {
  const colors = useColors();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);

  const [input, setInput] = useState("");
  const [items, setItems] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(false);

  const send = async (text: string) => {
    const query = text.trim();
    if (!query || loading) return;

    const userItem: ChatItem = { id: `u-${Date.now()}`, role: "user", text: query };
    setItems((prev) => [...prev, userItem]);
    setInput("");
    setLoading(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);

    try {
      const res = await patientApi.askAssistant(query);
      setItems((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          text: res.answer,
          sources: res.answered ? res.sources : undefined,
        },
      ]);
    } catch {
      setItems((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          text: "Não consegui responder agora. Tente novamente em instantes ou fale com a clínica.",
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={["top"]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} accessibilityLabel="Voltar">
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Tire suas dúvidas</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={[styles.disclaimer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
        <Text style={[styles.disclaimerText, { color: colors.textMuted }]}>{FIXED_DISCLAIMER}</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {items.length === 0 && (
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={40} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                Pergunte sobre seu tratamento
              </Text>
              <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
                Toque em um exemplo ou escreva sua dúvida.
              </Text>
              {EXAMPLES.map((ex) => (
                <TouchableOpacity
                  key={ex}
                  onPress={() => send(ex)}
                  style={[styles.example, { borderColor: colors.border, backgroundColor: colors.surface }]}
                >
                  <Text style={[styles.exampleText, { color: colors.text }]}>{ex}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {items.map((item) =>
            item.role === "user" ? (
              <View key={item.id} style={[styles.userBubble, { backgroundColor: colors.primary }]}>
                <Text style={styles.userText}>{item.text}</Text>
              </View>
            ) : (
              <View
                key={item.id}
                style={[styles.botBubble, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Text style={[styles.botText, { color: colors.text }]}>{item.text}</Text>
                {item.sources && item.sources.length > 0 && (
                  <View style={[styles.sources, { borderTopColor: colors.border }]}>
                    <Text style={[styles.sourcesLabel, { color: colors.textMuted }]}>Fontes</Text>
                    {item.sources.map((s) => (
                      <Text key={s.id} style={[styles.sourceItem, { color: colors.textSecondary }]}>
                        • {s.title}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            ),
          )}

          {loading && (
            <View style={[styles.botBubble, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <ActivityIndicator color={colors.primary} />
            </View>
          )}
        </ScrollView>

        <View style={[styles.inputBar, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            placeholder="Escreva sua dúvida..."
            placeholderTextColor={colors.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            editable={!loading}
            onSubmitEditing={() => send(input)}
          />
          <TouchableOpacity
            onPress={() => send(input)}
            disabled={loading || !input.trim()}
            style={[
              styles.sendBtn,
              { backgroundColor: colors.primary, opacity: loading || !input.trim() ? 0.5 : 1 },
            ]}
            accessibilityLabel="Enviar pergunta"
          >
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.screen,
    paddingBottom: Spacing.gap,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  disclaimer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    marginHorizontal: Spacing.screen,
    marginTop: Spacing.gap,
    padding: Spacing.tight,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  disclaimerText: { flex: 1, fontSize: 12, lineHeight: 16 },
  scrollContent: { padding: Spacing.screen, gap: Spacing.gap },
  empty: { alignItems: "center", gap: Spacing.sm, paddingVertical: Spacing.xl },
  emptyTitle: { fontSize: 16, fontWeight: "700", marginTop: Spacing.sm },
  emptyHint: { fontSize: 13, marginBottom: Spacing.gap, textAlign: "center" },
  example: {
    width: "100%",
    padding: Spacing.card,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  exampleText: { fontSize: 14 },
  userBubble: {
    alignSelf: "flex-end",
    maxWidth: "85%",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.card,
    borderRadius: 16,
    borderBottomRightRadius: 4,
  },
  userText: { color: "#fff", fontSize: 15, lineHeight: 21 },
  botBubble: {
    alignSelf: "flex-start",
    maxWidth: "90%",
    padding: Spacing.card,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  botText: { fontSize: 15, lineHeight: 22 },
  sources: { marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, gap: 2 },
  sourcesLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  sourceItem: { fontSize: 12, lineHeight: 17 },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: Spacing.sm,
    padding: Spacing.tight,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    maxHeight: 110,
    minHeight: 44,
    paddingHorizontal: Spacing.card,
    paddingTop: Platform.OS === "ios" ? 12 : 8,
    paddingBottom: Platform.OS === "ios" ? 12 : 8,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 15,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
